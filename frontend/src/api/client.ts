// Porta única pro backend — equivalente ao utils/query_executor.py.
// Nenhum componente/hook chama axios/fetch direto: tudo passa por
// aqui, e por isso a URL base, headers e tratamento de erro só
// existem em UM lugar.
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
