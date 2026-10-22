import { createSlice } from '@reduxjs/toolkit'

const theme = createSlice({
  name: 'theme',
  initialState: {
    theme: false,
  },

  reducers: {
    activ: (state) => {
      state.theme = !state.theme
    },
  },
})

export const { activ } = theme.actions
export default theme.reducer
