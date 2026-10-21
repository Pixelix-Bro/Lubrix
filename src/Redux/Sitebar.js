import { createSlice } from '@reduxjs/toolkit'

const lubrix = createSlice({
  name: 'Sitebar',
  initialState: {
    value: false,
  },

  reducers: {
    toggle: (state) => {
      return (state.value = !state.value)
    },
  },
})

export const { toggle } = lubrix
export default lubrix.reducer
