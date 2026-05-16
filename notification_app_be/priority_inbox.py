import heapq
import requests
from datetime import datetime

# server urls
AUTH_URL = "http://4.224.186.213/evaluation-service/auth"
NOTIF_URL = "http://4.224.186.213/evaluation-service/notifications"
LOG_URL = "http://4.224.186.213/evaluation-service/logs"

creds = {
    "email": "thanusha.n2022@vitstudent.ac.in",
    "name": "n thanusha",
    "rollNo": "22mis1207",
    "accessCode": "SfFuWg",
    "clientID": "8eee4f15-1deb-48d1-b3ae-8aae79c69669",
    "clientSecret": "fAkesVXMnnDuyEeK"
}

# log to the evaluation server instead of console
def log(level, pkg, message):
    try:
        requests.post(LOG_URL, json={
            "stack": "backend",
            "level": level,
            "package": pkg,
            "message": message
        })
    except:
        pass

def get_token():
    res = requests.post(AUTH_URL, json=creds)
    data = res.json()
    log("info", "auth", f"token acquired for priority inbox")
    return data["access_token"]

def fetch_notifications(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(NOTIF_URL, headers=headers)
    data = res.json()
    log("info", "handler", f"fetched {len(data['notifications'])} notifications from api")
    return data

# priority weights - placement > result > event
WEIGHTS = {
    "Placement": 3,
    "Result": 2,
    "Event": 1
}

def priority_score(notif):
    w = WEIGHTS.get(notif["Type"], 0)
    ts = datetime.strptime(notif["Timestamp"], "%Y-%m-%d %H:%M:%S")
    recency = ts.timestamp()
    return w * 1_000_000_000 + recency

def get_top_n(notifications, n=10):
    top = heapq.nlargest(n, notifications, key=priority_score)
    return top

if __name__ == "__main__":
    log("info", "service", "starting priority inbox script")

    token = get_token()
    data = fetch_notifications(token)
    notifications = data["notifications"]

    top10 = get_top_n(notifications, n=10)

    print("=" * 50)
    print(" TOP 10 PRIORITY NOTIFICATIONS")
    print("=" * 50)
    for i, n in enumerate(top10, 1):
        print(f"\n  {i}. [{n['Type']}] {n['Message']}")
        print(f"     time: {n['Timestamp']}")
        print(f"     id: {n['ID']}")

    log("info", "service", "priority inbox done - displayed top 10")
    print()
