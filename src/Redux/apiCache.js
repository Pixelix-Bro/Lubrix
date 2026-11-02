import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { lubrixApi } from '../services/api'

const unwrapData = (response) => response.data?.data ?? response.data

export const apiCache = createApi({
  reducerPath: 'apiCache',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Dashboard', 'Reports'],
  endpoints: (builder) => ({
    getHomeDashboard: builder.query({
      async queryFn() {
        try {
          const [dashboardResponse, servicesResponse, remindersResponse] = await Promise.all([
            lubrixApi.getDashboardAnalytics(),
            lubrixApi.getServices({ limit: 20 }),
            lubrixApi.getReminders(),
          ])
          return {
            data: {
              dashboard: unwrapData(dashboardResponse),
              services: unwrapData(servicesResponse) || [],
              reminders: unwrapData(remindersResponse) || [],
            },
          }
        } catch (error) {
          return {
            error: {
              status: error.response?.status || 'FETCH_ERROR',
              data: error.response?.data || error.message,
            },
          }
        }
      },
      providesTags: ['Dashboard'],
    }),
    getReportsDashboard: builder.query({
      async queryFn(year) {
        try {
          const [reportsResponse, remindersResponse] = await Promise.all([
            lubrixApi.getReports({ year }),
            lubrixApi.getReminders(),
          ])
          return {
            data: {
              report: unwrapData(reportsResponse),
              reminders: unwrapData(remindersResponse) || [],
            },
          }
        } catch (error) {
          return {
            error: {
              status: error.response?.status || 'FETCH_ERROR',
              data: error.response?.data || error.message,
            },
          }
        }
      },
      providesTags: ['Reports'],
    }),
  }),
})

export const { useGetHomeDashboardQuery, useGetReportsDashboardQuery } = apiCache
