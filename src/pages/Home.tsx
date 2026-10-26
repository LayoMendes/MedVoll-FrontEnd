import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowRight,
  CalendarPlus,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  MapPin,
  Moon,
  Stethoscope,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react'
import logoFull from '../assets/logo-full.png'
import { useNow } from '../hooks/useNow'
import { useSettings } from '../hooks/useStores'
import { useWeather, weatherLabel } from '../hooks/useWeather'
import { useData } from '../hooks/useData'
import { medicosService, pacientesService } from '../services/cadastros'
import { consultasService } from '../services/consultas'
import { greeting, parseLocalIso, sameDay } from '../lib/format'

function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const p = { size: 20, strokeWidth: 2.2 }
  if (code === 0) return isDay ? <Sun {...p} /> : <Moon {...p} />
  if (code <= 2) return <CloudSun {...p} />
  if (code === 3) return <Cloud {...p} />
  if (code <= 48) return <CloudFog {...p} />
  if (code <= 57) return <CloudDrizzle {...p} />
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain {...p} />
  if (code <= 77) return <CloudSnow {...p} />
  return <CloudLightning {...p} />
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export default function Home() {
  // Só a saudação depende da hora; o relógio fica na barra lateral.
  const now = useNow(60_000)
  const { city, tempUnit } = useSettings()
  const weather = useWeather(city, tempUnit)

  const { data } = useData(
    async () => {
      const [m, p, c] = await Promise.allSettled([medicosService.listar(), pacientesService.listar(), consultasService.listar()])
      const hoje = new Date()
      return {
        medicos: m.status === 'fulfilled' ? m.value.filter((x) => x.ativo).length : null,
        pacientes: p.status === 'fulfilled' ? p.value.filter((x) => x.ativo).length : null,
        hoje:
          c.status === 'fulfilled'
            ? c.value.filter((x) => x.status === 'AGENDADA' && sameDay(parseLocalIso(x.data), hoje)).length
            : null,
      }
    },
    ['medicos', 'pacientes', 'consultas'],
  )

  const quick = useMemo(
    () => [
      { to: '/agenda?novo=1', icon: CalendarPlus, title: 'Nova consulta', sub: data?.hoje != null ? `${data.hoje} hoje na agenda` : 'Agendar atendimento' },
      { to: '/medicos', icon: Stethoscope, title: 'Médicos', sub: data?.medicos != null ? `${data.medicos} ativos` : 'Corpo clínico' },
      { to: '/pacientes', icon: Users, title: 'Pacientes', sub: data?.pacientes != null ? `${data.pacientes} cadastrados` : 'Base de pacientes' },
      { to: '/pacientes?novo=1', icon: UserPlus, title: 'Novo paciente', sub: 'Cadastro rápido' },
    ],
    [data],
  )

  return (
    <section className="home">
      <div className="home__col">
        <motion.div className="hero" variants={container} initial="hidden" animate="show">
          <motion.img variants={item} src={logoFull} alt="MedVoll" className="hero__logo" />

          <motion.h1 variants={item} className="hero__slogan">
            Medicina que cuida.
            <br />
            <span>Tecnologia que organiza.</span>
          </motion.h1>
          <motion.p variants={item} className="hero__lead">
            Agenda, médicos e pacientes da clínica em um só lugar.
          </motion.p>

          <motion.div variants={item} className="hero__meta">
            <span className="hero__greeting">{greeting(now)}!</span>
            <div className="hero__weather" aria-live="polite">
              {weather.status === 'loading' && (
                <>
                  <span className="hero__weather-icon">
                    <Loader2 size={18} className="spin" />
                  </span>
                  <span>Obtendo clima local…</span>
                </>
              )}
              {weather.status === 'error' && (
                <>
                  <span className="hero__weather-icon">
                    <MapPin size={18} />
                  </span>
                  <span>Clima indisponível no momento</span>
                </>
              )}
              {weather.status === 'ready' && weather.data && (
                <>
                  <span className="hero__weather-icon">
                    <WeatherIcon code={weather.data.code} isDay={weather.data.isDay} />
                  </span>
                  <span className="hero__weather-temp">
                    {Math.round(weather.data.temperature)}°{weather.data.unit}
                  </span>
                  <span className="hero__divider" />
                  <span className="hero__weather-city">
                    <strong>
                      <MapPin size={13} />
                      {weather.data.city}
                      {weather.data.region ? `, ${weather.data.region}` : ''}
                    </strong>
                    <span>
                      {weatherLabel(weather.data.code)}
                      {weather.usingFallback ? ' · localização padrão' : ''}
                    </span>
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.nav className="quick" aria-label="Atalhos" variants={container} initial="hidden" animate="show">
          {quick.map((q) => (
            <motion.div key={q.to} variants={item}>
              <Link to={q.to} className="quick__item">
                <span className="quick__icon">
                  <q.icon size={20} strokeWidth={2.2} />
                </span>
                <span className="quick__text">
                  <strong>{q.title}</strong>
                  <span>{q.sub}</span>
                </span>
                <ArrowRight size={18} className="quick__arrow" />
              </Link>
            </motion.div>
          ))}
        </motion.nav>
      </div>
    </section>
  )
}
