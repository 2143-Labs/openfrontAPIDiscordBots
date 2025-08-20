/// Send as post to openfront.pro/api/v1/lobbies
async function send_to_openfront_pro(payload) {
    try {
        let res = await fetch("https://openfront.pro/api/v1/lobbies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.error("Failed to send data to openfront.pro:", res.status, res.statusText);
        } else {
//            console.log("Data sent successfully to openfront.pro");
        }
    } catch (error) {
        console.error("Error sending data to openfront.pro:", error);
    }
}
async function lobbyFetch() {
    let res = await fetch("https://openfront.io/api/public_lobbies")
    let j = await res.json();
    send_to_openfront_pro(j)
}
setInterval(lobbyFetch, 10000)
