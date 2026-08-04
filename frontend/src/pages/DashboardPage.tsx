import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage, listDocuments } from "../services/api";
import type { DocumentListItem } from "../types/document";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });

export const DashboardPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await listDocuments();
        setDocuments(items.slice(0, 5));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const pendingCount = documents.filter((doc) => doc.status !== "reviewed").length;
  const reviewedCount = documents.filter((doc) => doc.status === "reviewed").length;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Welcome{user?.name ? `, ${user.name}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Upload documents for OCR extraction, connect integrations, or review
          analytics.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)"
          }
        }}
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            In recent list
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {loading ? "—" : documents.length}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Pending (recent)
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {loading ? "—" : pendingCount}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Reviewed (recent)
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {loading ? "—" : reviewedCount}
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)"
          }
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <CloudUploadOutlinedIcon color="primary" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              Upload Document
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Upload a PDF or image, extract fields with OCR, and review them in
              a form.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              component={RouterLink}
              to="/documents/upload"
              variant="contained"
            >
              Open upload
            </Button>
          </CardActions>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <DescriptionOutlinedIcon color="primary" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              My Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Browse previously uploaded files and reopen reviews anytime.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button component={RouterLink} to="/documents">
              View documents
            </Button>
          </CardActions>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <ExtensionOutlinedIcon color="primary" sx={{ mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              Integrations
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Microsoft Teams and Email intake in one place. Coming soon.
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button component={RouterLink} to="/integrations">
              Open integrations
            </Button>
          </CardActions>
        </Card>
      </Box>

      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Recent uploads
          </Typography>
          <Button component={RouterLink} to="/documents" size="small">
            See all
          </Button>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : documents.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No uploads yet. Start with Upload Document to see files here.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <Stack
              divider={
                <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />
              }
            >
              {documents.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap"
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {doc.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(doc.createdAt)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={
                      doc.status === "reviewed" ? "Reviewed" : "Pending review"
                    }
                    color={doc.status === "reviewed" ? "success" : "warning"}
                    variant="outlined"
                  />
                  <Button
                    component={RouterLink}
                    to={`/documents/${doc.id}`}
                    size="small"
                  >
                    Open
                  </Button>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </Stack>
  );
};
