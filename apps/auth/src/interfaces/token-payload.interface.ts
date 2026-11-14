export interface ITokenPayload {
  userId: string;
}

export interface IRefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export class RefreshTokenPayload implements IRefreshTokenPayload {
  userId!: string;
  tokenId!: string;
}
