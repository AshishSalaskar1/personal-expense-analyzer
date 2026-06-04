import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Upload ──────────────────────────────────────────────────────────────────
export const uploadPDF = (formData) =>
  api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ── Months ───────────────────────────────────────────────────────────────────
export const getMonths = () => api.get('/months')
export const deleteMonth = (month) => api.delete(`/months/${month}`)

// ── Transactions ─────────────────────────────────────────────────────────────
export const saveTransactions = (month, transactions, replace = false) =>
  api.post('/transactions/save', { month, transactions, replace })

export const getTransactions = (params = {}) =>
  api.get('/transactions', { params })

export const updateComments = (id, comments) =>
  api.put(`/transactions/${id}/comments`, { comments })

// ── Tags ─────────────────────────────────────────────────────────────────────
export const resolveTags = (particulars) =>
  api.post('/tags/resolve', { particulars })

export const getTagMappings = () => api.get('/tag-mappings')

export const updateTagMapping = (particulars, category) =>
  api.put('/tag-mappings', { particulars, category })

// ── Export / Import ───────────────────────────────────────────────────────────
export const importDB = (formData) =>
  api.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export default api
