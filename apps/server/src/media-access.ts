export interface MediaAccess {
  signedUrl(workspaceId: string, assetId: string, ttlSeconds: number): Promise<string>;
  read(workspaceId: string, assetId: string): Promise<Uint8Array>;
}
