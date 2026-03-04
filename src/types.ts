export enum SubstrateType {
  SHEET = 'Lámina/Sustrato Rígido',
  ROLL = 'Rollo de Vinilo'
}

export interface InkComponent {
  id: string;
  name: string;
  ml: number;
}

export interface Project {
  id: string;
  name: string;
  date: string;
  substrateType: SubstrateType;
  width: number; // in meters
  height: number; // in meters
  quantity: number;
  inks: InkComponent[];
  totalArea: number; // m2
  totalInkMl: number;
  mlPerM2: number;
}

export const DEFAULT_ROLL_WIDTH = 1.5;
export const DEFAULT_ROLL_LENGTH = 50;
