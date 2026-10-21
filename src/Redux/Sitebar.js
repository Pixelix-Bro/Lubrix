import { createSlice } from '@reduxjs/toolkit'

const lubrix = createSlice({
  name: 'Sitebar',
  initialState: {
    value: false,
  },

  reducers: {
    Opens: (state) => {
      state.value = !state.value
    },
  },
})

export const { Opens } = lubrix.actions
export default lubrix.reducer
