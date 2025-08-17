import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Setup requests interception using the given handlers
export const server = setupServer(
  // Mock API endpoints
  rest.get('http://localhost:8000/api/get-csrf-token/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ detail: 'CSRF cookie set' })
    );
  }),

  rest.get('http://localhost:8000/api/auth/user/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ is_authenticated: false })
    );
  }),

  rest.post('http://localhost:8000/api/profiles/*/goals/', (req, res, ctx) => {
    const { monthly_spending, spending_cushion, cushion_amount } = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: 1,
        monthly_spending,
        spending_cushion,
        cushion_amount,
        created_at: new Date().toISOString()
      })
    );
  }),

  // Add more endpoints as needed
  
);