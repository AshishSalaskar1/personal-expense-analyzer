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

export const getTransactions = (params = {}) => {
  // map frontend filter keys to backend query param names
  const p = { ...params }
  if (p.type) { p.tx_type = p.type; delete p.type }
  return api.get('/transactions', { params: p })
}

export const updateComments = (id, comments) =>
  api.put(`/transactions/${id}/comments`, { comments })

// ── Tags ─────────────────────────────────────────────────────────────────────
export const resolveTags = (particulars) =>
  api.post('/tags/resolve', { particulars })

export const getTagMappings = () => api.get('/tag-mappings')

export const updateTagMapping = (particulars, category) =>
  api.put('/tag-mappings', { particulars, category })

export const setTagIgnored = (tag, ignored) =>
  api.put('/tag-mappings/ignore', { tag, ignored })

// ── Export / Import ───────────────────────────────────────────────────────────
export const importDB = (formData) =>
  api.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export default api
