export const getFaceApiModelUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/face-verify-app/models'
  }
  return '/models'
}
