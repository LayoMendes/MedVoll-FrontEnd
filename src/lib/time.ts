// Regras de agenda seguidas pela clínica (mesmas regras de negócio do projeto Voll.med).
export const CLINICA = {
  abertura: 7, // 07:00
  fechamento: 19, // última consulta começa às 18:00
  duracaoMin: 60,
  antecedenciaMin: 30,
  cancelamentoHoras: 24,
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const startOfWeek = (d: Date) => {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // segunda = 0
  return addDays(x, -dow)
}

export const horariosDoDia = () =>
  Array.from({ length: CLINICA.fechamento - CLINICA.abertura }, (_, i) => CLINICA.abertura + i)
