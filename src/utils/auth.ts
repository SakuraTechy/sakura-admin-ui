const TOKEN_KEY = 'token'

const notifySessionCacheClear = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('session-cache-clear'))
}

const isLogin = () => {
  return !!localStorage.getItem(TOKEN_KEY)
}

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

const setToken = (token: string) => {
  if (localStorage.getItem(TOKEN_KEY) !== token) notifySessionCacheClear()
  localStorage.setItem(TOKEN_KEY, token)
}

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  notifySessionCacheClear()
}

export { isLogin, getToken, setToken, clearToken }
