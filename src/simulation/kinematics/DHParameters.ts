export interface DHParam {
  readonly a: number           // link length (m)
  readonly d: number           // link offset (m)
  readonly alpha: number       // link twist (rad)
  readonly thetaOffset: number // constant joint angle offset (rad)
}
