export type Managed = {
  start(): Promise<void>
  stop(): Promise<void>
}
