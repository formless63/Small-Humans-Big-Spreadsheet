import { RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { getRouter } from './router'

const rootElement = document.getElementById('app')!
ReactDOM.createRoot(rootElement).render(<RouterProvider router={getRouter()} />)
