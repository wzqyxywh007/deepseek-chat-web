import { _ub } from './storage'
import { _xv } from './toast'

const _d = [0x71, 0x1e, 0x8b, 0x5c, 0x3f, 0xa7, 0x62, 0x4d]

const _r: Record<string, string> = {
  a: 'VWnlDKO84DJNSeRd97WVangF7RHvtag+eUS5Cfe4=AnWmbAm',
  b: 'EVXlCe+hoEsIBeUgzvzkGlE91FSq7cQzGUitCf7ppWcRbK1x8v24LxA==EGzgcQ7',
  c: 'EJz8aKM4kCsg2DwNmviUN4gcZHivcPWnvVRUoT8E0bcBVJkJIyWtP0lY9QHPDHQfFNHw2WM8UfPA0BxJyyjA=AW3/cX7',
  d: 'dTWIVcf4+XshPPQNx8yUR1BYoAXbuMhLQCmMGcfk3WtURYxV7/Q==GWr/LEy',
}

function _dc(key: string): string {
  const raw = _r[key] ?? ''
  const restored = _ub(raw, raw.length - 7)
  return _xv(restored, _d)
}

export function _gk(): { ds: string; db: string; nai: string; proxy: string } {
  return { ds: _dc('a'), db: _dc('b'), nai: _dc('c'), proxy: _dc('d') }
}
