import { combineReducers } from "redux-loop";
import authReducer, { AuthState, initialState as initialAuthState } from "./reducers/auth";
import projectsReducer, {
  initialState as initialProjectsState,
  ProjectsState
} from "./reducers/projects";
import regionConfigReducer, {
  initialState as initialRegionConfigState,
  RegionConfigState
} from "./reducers/regionConfig";
import userReducer, { initialState as initialUserState, UserState } from "./reducers/user";

export interface State {
  readonly auth: AuthState;
  readonly user: UserState;
  readonly regionConfig: RegionConfigState;
  readonly projects: ProjectsState;
}

export const initialState: State = {
  auth: initialAuthState,
  user: initialUserState,
  regionConfig: initialRegionConfigState,
  projects: initialProjectsState
};

export default combineReducers({
  auth: authReducer,
  user: userReducer,
  regionConfig: regionConfigReducer,
  projects: projectsReducer
});
