import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

/**
 * Fundo animado com ShaderGradient (github.com/ruucm/shadergradient) nas cores da marca.
 * Usa luz "3d" (sem HDR externo) e cai para um gradiente CSS se o WebGL não estiver disponível.
 */

const PALETTES = {
  // Ondas em azul bem visíveis; no claro, um halo branco atrás da logo (global.css) mantém o contraste.
  light: { color1: '#FFFFFF', color2: '#6FB2F0', color3: '#D4EAFC', brightness: 1.15 },
  dark: { color1: '#2563B0', color2: '#060C18', color3: '#12407A', brightness: 1 },
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class GlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function ShaderBackground({ theme, animate }: { theme: 'light' | 'dark'; animate: boolean }) {
  const [supported] = useState(hasWebGL)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const p = PALETTES[theme]

  return (
    <>
      <div className="shader-bg" aria-hidden>
        {supported && (
          <GlBoundary>
            <Suspense fallback={null}>
              <ShaderGradientCanvas
                key={theme}
                style={{ position: 'absolute', inset: 0 }}
                pixelDensity={Math.min(window.devicePixelRatio || 1, 1.5)}
                fov={45}
                pointerEvents="none"
                lazyLoad={false}
              >
                <ShaderGradient
                  control="props"
                  type="waterPlane"
                  animate={animate && !reduced ? 'on' : 'off'}
                  uTime={2}
                  uSpeed={0.1}
                  uStrength={3.6}
                  uDensity={1.25}
                  uFrequency={0}
                  uAmplitude={0}
                  positionX={0}
                  positionY={0.9}
                  positionZ={-0.3}
                  rotationX={45}
                  rotationY={0}
                  rotationZ={0}
                  color1={p.color1}
                  color2={p.color2}
                  color3={p.color3}
                  reflection={0.12}
                  cAzimuthAngle={170}
                  cPolarAngle={70}
                  cDistance={4.4}
                  cameraZoom={1}
                  lightType="3d"
                  brightness={p.brightness}
                  envPreset="city"
                  grain="off"
                />
              </ShaderGradientCanvas>
            </Suspense>
          </GlBoundary>
        )}
      </div>
    </>
  )
}
