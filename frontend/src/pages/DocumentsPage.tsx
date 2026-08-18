import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { getErrorMessage, listDocuments } from "../services/api";
import type { DocumentListItem } from "../types/document";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });

const statusLabel = (status: string) =>
  status === "reviewed" ? "Reviewed" : "Pending review";

const statusColor = (status: string): "success" | "warning" =>
  status === "reviewed" ? "success" : "warning";

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await listDocuments();
        setDocuments(items);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap"
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            My Documents
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            View uploaded files and reopen them to review or edit extracted
            fields.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/documents/upload"
          variant="contained"
        >
          Upload new
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <DescriptionOutlinedIcon
            color="disabled"
            sx={{ fontSize: 48, mb: 1 }}
          />
          <Typography variant="h6" fontWeight={700}>
            No documents yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload a PDF or image to run OCR and see it listed here.
          </Typography>
          <Button
            component={RouterLink}
            to="/documents/upload"
            variant="contained"
          >
            Upload document
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Form</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {doc.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.mimeType}
                    </Typography>
                  </TableCell>
                  <TableCell>{doc.templateName}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabel(doc.status)}
                      color={statusColor(doc.status)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(doc.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/documents/${doc.id}`}
                      size="small"
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
};
