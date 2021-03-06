import { Cmd, Loop, loop, LoopReducer } from "redux-loop";
import { getType } from "typesafe-actions";

import { Action } from "../actions";
import { SavingState } from "../types";

import {
  addSelectedGeounits,
  clearHighlightedGeounits,
  clearSelectedGeounits,
  editSelectedGeounits,
  redo,
  removeSelectedGeounits,
  setGeoLevelIndex,
  setGeoLevelVisibility,
  setHighlightedGeounits,
  setSelectedDistrictId,
  setSelectionTool,
  setSelectedGeounits,
  showAdvancedEditingModal,
  toggleDistrictLocked,
  undo,
  replaceSelectedGeounits,
  toggleFind,
  setFindIndex
} from "../actions/districtDrawing";
import { SelectionTool } from "../actions/districtDrawing";
import { resetProjectState } from "../actions/root";
import { GeoUnits, GeoUnitsForLevel, LockedDistricts } from "../../shared/entities";
import { ProjectState, initialProjectState } from "./project";
import { setFeaturesSelectedFromGeoUnits } from "../components/map";

function setGeoUnitsForLevel(
  currentGeoUnits: GeoUnitsForLevel,
  geoUnitsToAdd: GeoUnitsForLevel,
  geoUnitsToDelete: GeoUnitsForLevel
): GeoUnitsForLevel {
  const mutableSelected = new Map([...currentGeoUnits, ...geoUnitsToAdd]);
  geoUnitsToDelete.forEach((_value, key) => {
    mutableSelected.delete(key);
  });
  return mutableSelected;
}

function editGeoUnits(
  currentGeoUnits: GeoUnits,
  geoUnitsToAdd?: GeoUnits,
  geoUnitsToDelete?: GeoUnits
): GeoUnits {
  const allKeys = new Set(
    Object.keys(currentGeoUnits)
      .concat(Object.keys(geoUnitsToAdd || {}))
      .concat(Object.keys(geoUnitsToDelete || {}))
  );
  return [...allKeys].reduce((geoUnits, geoLevelId) => {
    return {
      ...geoUnits,
      [geoLevelId]: setGeoUnitsForLevel(
        currentGeoUnits[geoLevelId] || new Map(),
        (geoUnitsToAdd && geoUnitsToAdd[geoLevelId]) || new Map(),
        (geoUnitsToDelete && geoUnitsToDelete[geoLevelId]) || new Map()
      )
    };
  }, {} as GeoUnits);
}

function clearGeoUnits(geoUnits: GeoUnits): GeoUnits {
  return Object.keys(geoUnits).reduce((geoUnits, geoLevelId) => {
    return {
      ...geoUnits,
      [geoLevelId]: new Map()
    };
  }, {});
}

function pushState(state: ProjectState, undoState: UndoableState): ProjectState {
  return {
    ...state,
    // Need to clear new project GeoJSON whenever clearing redo states
    currentProjectData: undefined,
    undoHistory: {
      past: [...state.undoHistory.past, state.undoHistory.present],
      present: undoState,
      future: []
    }
  };
}

function replaceState(state: ProjectState, undoState: UndoableState) {
  return { ...state, undoHistory: { ...state.undoHistory, present: undoState } };
}

function undoOrRedo(
  map: mapboxgl.Map,
  state: ProjectState,
  { past, present, future }: UndoHistory
) {
  return loop(
    {
      ...state,
      undoHistory: {
        past,
        present,
        future
      }
    },
    Cmd.run(() => {
      setFeaturesSelectedFromGeoUnits(map, state.undoHistory.present.selectedGeounits, false);
      setFeaturesSelectedFromGeoUnits(map, present.selectedGeounits, true);
    })
  );
}

interface UndoableState {
  readonly selectedGeounits: GeoUnits;
  readonly geoLevelIndex: number; // Index is based off of reversed geoLevelHierarchy in static metadata
  readonly geoLevelVisibility: ReadonlyArray<boolean>; // Visibility values at indices corresponding to `geoLevelIndex`
  readonly lockedDistricts: LockedDistricts;
}

export interface UndoHistory {
  readonly past: readonly UndoableState[];
  readonly present: UndoableState;
  readonly future: readonly UndoableState[];
}

export interface DistrictDrawingState {
  readonly selectedDistrictId: number;
  readonly highlightedGeounits: GeoUnits;
  readonly selectionTool: SelectionTool;
  readonly showAdvancedEditingModal: boolean;
  readonly findMenuOpen: boolean;
  readonly findIndex?: number;
  readonly saving: SavingState;
  readonly undoHistory: UndoHistory;
}

export const initialDistrictDrawingState: DistrictDrawingState = {
  selectedDistrictId: 1,
  highlightedGeounits: {},
  selectionTool: SelectionTool.Default,
  showAdvancedEditingModal: false,
  findMenuOpen: false,
  saving: "unsaved",
  undoHistory: {
    past: [],
    present: {
      selectedGeounits: {},
      geoLevelIndex: 0,
      geoLevelVisibility: [],
      lockedDistricts: new Set()
    },
    future: []
  }
};

const districtDrawingReducer: LoopReducer<ProjectState, Action> = (
  state: ProjectState = initialProjectState,
  action: Action
): ProjectState | Loop<ProjectState, Action> => {
  const { present } = state.undoHistory;
  switch (action.type) {
    case getType(resetProjectState):
      return {
        ...state,
        ...initialDistrictDrawingState
      };
    case getType(setSelectedDistrictId):
      return {
        ...state,
        selectedDistrictId: action.payload
      };
    case getType(addSelectedGeounits):
      return loop(
        state,
        Cmd.action(
          editSelectedGeounits({
            add: action.payload
          })
        )
      );
    case getType(removeSelectedGeounits):
      return loop(
        state,
        Cmd.action(
          editSelectedGeounits({
            remove: action.payload
          })
        )
      );
    // Note the only difference between this and replaceSelectedGeounits is whether we use pushState or replaceState
    case getType(editSelectedGeounits):
      return pushState(state, {
        ...present,
        selectedGeounits: editGeoUnits(
          present.selectedGeounits,
          action.payload.add,
          action.payload.remove
        )
      });
    case getType(replaceSelectedGeounits):
      return replaceState(state, {
        ...present,
        selectedGeounits: editGeoUnits(
          present.selectedGeounits,
          action.payload.add,
          action.payload.remove
        )
      });
    case getType(setSelectedGeounits):
      return pushState(state, {
        ...present,
        selectedGeounits: action.payload
      });
    case getType(clearSelectedGeounits): {
      const clearedViaCancel = action.payload;
      return pushState(
        {
          ...state,
          saving: clearedViaCancel ? "unsaved" : "saved"
        },
        {
          ...present,
          selectedGeounits: clearGeoUnits(present.selectedGeounits)
        }
      );
    }
    case getType(setHighlightedGeounits):
      return {
        ...state,
        highlightedGeounits: action.payload
      };
    case getType(clearHighlightedGeounits):
      return {
        ...state,
        highlightedGeounits: clearGeoUnits(state.highlightedGeounits)
      };
    case getType(setSelectionTool):
      return {
        ...state,
        selectionTool: action.payload
      };
    case getType(setGeoLevelIndex):
      return replaceState(state, {
        ...present,
        geoLevelIndex: action.payload
      });
    case getType(setGeoLevelVisibility):
      return replaceState(state, {
        ...present,
        geoLevelVisibility: action.payload
      });
    case getType(toggleDistrictLocked):
      return pushState(state, {
        ...present,
        lockedDistricts: new Set(
          present.lockedDistricts.has(action.payload)
            ? [...present.lockedDistricts.values()].filter(
                districtId => districtId !== action.payload
              )
            : [...present.lockedDistricts.values(), action.payload]
        )
      });
    case getType(showAdvancedEditingModal):
      return {
        ...state,
        showAdvancedEditingModal: action.payload
      };
    case getType(toggleFind):
      return {
        ...state,
        findMenuOpen: action.payload,
        findIndex: undefined
      };
    case getType(setFindIndex):
      return {
        ...state,
        findIndex: action.payload
      };
    case getType(undo): {
      const projectData =
        state.undoHistory.past.length === 1 && state.previousProjectData
          ? { projectData: state.previousProjectData }
          : {};
      return state.undoHistory.past.length === 0
        ? state
        : undoOrRedo(
            action.payload,
            { ...state, ...projectData },
            {
              past: state.undoHistory.past.slice(0, -1),
              present: state.undoHistory.past[state.undoHistory.past.length - 1],
              future: [present, ...state.undoHistory.future]
            }
          );
    }
    case getType(redo): {
      const projectData =
        state.undoHistory.past.length === 0 && state.currentProjectData
          ? { projectData: state.currentProjectData }
          : {};
      return state.undoHistory.future.length === 0
        ? state
        : undoOrRedo(
            action.payload,
            { ...state, ...projectData },
            {
              past: [...state.undoHistory.past, present],
              present: state.undoHistory.future[0],
              future: state.undoHistory.future.slice(1)
            }
          );
    }
    default:
      return state as never;
  }
};

export default districtDrawingReducer;
