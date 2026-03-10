const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

export async function sendToAll(tokens, { title, body, data = {} }) {
  if (!FCM_SERVER_KEY) {
    console.warn("FCM_SERVER_KEY not set. Cannot send notification.");
    return { successCount: 0, failureCount: tokens?.length || 0 };
  }
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body },
        data
      })
    });
    const result = await response.json();
    return {
      successCount: result.success || 0,
      failureCount: result.failure || 0
    };
  } catch (error) {
    console.error("FCM Send error:", error);
    return { successCount: 0, failureCount: tokens.length };
  }
}

export async function sendToOne(token, { title, body, data = {} }) {
  return sendToAll([token], { title, body, data });
}
