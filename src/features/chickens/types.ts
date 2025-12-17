export interface ChickenDto {
  id: string;
  organizationId: string;
  uniqueCode: string;
  visualIdType: string;
  visualIdColor: string;
  visualIdNumber: string;
  breedPrimary: string;
  breedSecondary: string | null;
  sex: string;
  hatchDate: string | null;
  status: string;
  statusDate: string | null;
  coopLocationName: string | null;
  notes: string | null;
}


