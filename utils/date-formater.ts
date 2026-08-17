export type DateValue = Date | string | number

const pad = (value: number) => String(value).padStart(2, '0')

export default (value: DateValue): string => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()

  const period = date.getHours() >= 12 ? 'PM' : 'AM'
  const hour = date.getHours() % 12 || 12
  const time = `${pad(hour)}:${pad(date.getMinutes())} ${period}`

  if (isToday) {
    return time
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${time}`
}
