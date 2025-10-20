import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "gerador-de-livros", 
  eventKey: process.env.INNGEST_EVENT_KEY,
  // Em produção, usar a URL do Netlify
  ...(process.env.NODE_ENV === 'production' && {
    isDev: false
  })
});