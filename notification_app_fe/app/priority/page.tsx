"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  AppBar,
  Toolbar,
  Button,
  TextField,
} from "@mui/material";
import { Notification, fetchNotifications, log } from "../lib/api";
import Link from "next/link";

const WEIGHTS: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function priorityScore(n: Notification) {
  const w = WEIGHTS[n.Type] || 0;
  const ts = new Date(n.Timestamp).getTime();
  return w * 1_000_000_000 + ts;
}

export default function PriorityPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState(10);
  const [filter, setFilter] = useState("");
  const [viewed, setViewed] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("viewedNotifs");
    if (saved) setViewed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      await log("info", "page", "loaded notifications for priority inbox");
    } catch (e) {
      setError("Failed to load notifications");
      await log("error", "page", "priority page load failed");
    }
    setLoading(false);
  }

  function markViewed(id: string) {
    const updated = [...viewed, id];
    setViewed(updated);
    localStorage.setItem("viewedNotifs", JSON.stringify(updated));
  }

  // sort by priority and take top N
  let sorted = [...notifications].sort((a, b) => priorityScore(b) - priorityScore(a));
  if (filter) sorted = sorted.filter((n) => n.Type === filter);
  const topNotifs = sorted.slice(0, topN);

  function getChipColor(type: string) {
    if (type === "Placement") return "success";
    if (type === "Result") return "primary";
    return "default";
  }

  return (
    <>
      <AppBar position="static" color="secondary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Priority Inbox
          </Typography>
          <Button color="inherit" component={Link} href="/">
            All Notifications
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
          <TextField
            label="Top N"
            type="number"
            size="small"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value) || 10)}
            sx={{ width: 100 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Type</InputLabel>
            <Select
              value={filter}
              label="Filter Type"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Placement">Placement</MenuItem>
              <MenuItem value="Result">Result</MenuItem>
              <MenuItem value="Event">Event</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing top {topNotifs.length} by priority (Placement &gt; Result &gt; Event + recency)
        </Typography>

        {loading && (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {!loading &&
          topNotifs.map((n, idx) => (
            <Card
              key={n.ID}
              sx={{
                mb: 1.5,
                borderLeft: viewed.includes(n.ID)
                  ? "4px solid #ccc"
                  : "4px solid #9c27b0",
                opacity: viewed.includes(n.ID) ? 0.7 : 1,
                cursor: "pointer",
              }}
              onClick={() => markViewed(n.ID)}
            >
              <CardContent
                sx={{ display: "flex", justifyContent: "space-between", py: 1.5, "&:last-child": { pb: 1.5 } }}
              >
                <Box>
                  <Typography variant="body1">
                    #{idx + 1} {n.Message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {n.Timestamp}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={n.Type}
                    size="small"
                    color={getChipColor(n.Type) as any}
                  />
                  {!viewed.includes(n.ID) && (
                    <Chip label="New" size="small" color="warning" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
      </Container>
    </>
  );
}
