export const getFaceApiModelUrl = () => {
  if (typeof window === 'undefined') return '/models'
  return `${window.location.origin}/models`
}
