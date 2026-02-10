import { app } from "./app";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
