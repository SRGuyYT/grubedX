export async function sendMatrixAlert(message: string) {
  const webhookUrl = process.env.MATRIX_HOOKSHOT_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Matrix webhook is not configured.");
  }

  const attempts = [
    {
      label: "json-text",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    },
    {
      label: "matrix-json",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: message, msgtype: "m.text" }),
    },
    {
      label: "plain-text",
      headers: { "Content-Type": "text/plain" },
      body: message,
    },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: attempt.headers,
        body: attempt.body,
      });

      if (response.ok) {
        return;
      }

      failures.push(`${attempt.label}:${response.status}`);
    } catch (error) {
      failures.push(`${attempt.label}:${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  console.error("Matrix webhook failed for every payload format", failures);
  throw new Error("Matrix webhook failed.");
}
