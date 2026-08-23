import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '')

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { Accept: 'application/json' },
})

export async function apiRequest(path, options = {}) {
  const { token, body, headers, method = 'GET', ...requestOptions } = options
  try {
    const response = await client.request({
      url: path,
      method,
      data: body,
      headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...requestOptions,
    })
    return response.data
  } catch (error) {
    if (!error.response) throw new Error('SecureVault cannot reach the local API on port 5001.', { cause: error })
    const message = error.response.data?.message || error.response.data?.error || (error.response.status === 401 ? 'Your session has expired. Please unlock your vault again.' : 'Something went wrong. Please try again.')
    throw new Error(message, { cause: error })
  }
}
