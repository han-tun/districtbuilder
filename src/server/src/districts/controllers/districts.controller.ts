import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post
} from "@nestjs/common";
import { FeatureCollection } from "geojson";

import { DistrictsDefinitionDto } from "../entities/district-definition.dto";
import { TopologyService } from "../services/topology.service";

@Controller("districts")
export class DistrictsController {
  constructor(public topologyService: TopologyService) {}

  @Post(":topologyKey")
  async makeDistricts(
    @Param("topologyKey") topologyKey: string,
    @Body() definition: DistrictsDefinitionDto
  ): Promise<FeatureCollection> {
    const geoCollection = await this.topologyService.get(topologyKey);
    if (!geoCollection) {
      throw new NotFoundException(`Topology ${topologyKey} not found`);
    }
    const geojson = geoCollection.merge(definition);
    if (geojson === null) {
      throw new BadRequestException("District definition is invalid");
    }
    return geojson;
  }
}