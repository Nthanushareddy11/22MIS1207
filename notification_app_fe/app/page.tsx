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
  Button,
  CircularProgress,
  AppBar,
  Toolbar,
} from "@mui/material";
import { Notification, fetchNotifications, log } from "./lib/api";
import Link from "next/link";

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [viewed, setViewed] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("viewedNotifs");
    if (saved) setViewed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [filter, page]);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications(page, filter || undefined);
      setNotifications(data);
    } catch (e) {
      setError("Could not load notifications. Try again.");
      await log("error", "page", "failed loading notifications on main page");
    }
    setLoading(false);
  }

  function markViewed(id: string) {
    const updated = [...viewed, id];
    setViewed(updated);
    localStorage.setItem("viewedNotifs", JSON.stringify(updated));
  }

  function getChipColor(type: string) {
    if (type === "Placement") return "success";
    if (type === "Result") return "primary";
    return "default";
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Notifications
          </Typography>
          <Button color="inherit" component={Link} href="/priority">
            Priority Inbox
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Type</InputLabel>
            <Select
              value={filter}
              label="Filter Type"
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Placement">Placement</MenuItem>
              <MenuItem value="Result">Result</MenuItem>
              <MenuItem value="Event">Event</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Page {page}
            </Typography>
          </Box>
        </Box>

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
          notifications.map((n) => (
            <Card
              key={n.ID}
              sx={{
                mb: 1.5,
                borderLeft: viewed.includes(n.ID)
                  ? "4px solid #ccc"
                  : "4px solid #1976d2",
                opacity: viewed.includes(n.ID) ? 0.7 : 1,
                cursor: "pointer",
              }}
              onClick={() => markViewed(n.ID)}
            >
              <CardContent
                sx={{ display: "flex", justifyContent: "space-between", py: 1.5, "&:last-child": { pb: 1.5 } }}
              >
                <Box>
                  <Typography variant="body1">{n.Message}</Typography>
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
