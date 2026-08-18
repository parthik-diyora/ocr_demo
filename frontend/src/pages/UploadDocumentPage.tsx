import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentViewer } from "../components/DocumentViewer";
import { ExtractedFieldsForm } from "../components/ExtractedFieldsForm";
import { UploadPanel } from "../components/UploadPanel";
import { useDocumentWorkflow } from "../hooks/useDocumentWorkflow";

export const UploadDocumentPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const workflow = useDocumentWorkflow(id);

  const handleUpload = async (file: File) => {
    const result = await workflow.upload(file);
    if (result) {
      navigate(`/documents/${result.documentId}`, { replace: true });
    }
  };

  const handleNewDocument = () => {
    workflow.reset();
    navigate("/documents/upload");
  };

  return (
    <Stack spacing={2} sx={{ minHeight: { lg: "calc(100vh - 140px)" } }}>
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
            {id ? "Review Document" : "Upload Document"}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {id
              ? "Review extracted fields and save updates."
              : "Upload a PDF or image to extract fields with OCR and review them."}
          </Typography>
        </Box>
        {workflow.document && (
          <Button
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            onClick={handleNewDocument}
          >
            New document
          </Button>
        )}
      </Box>

      {workflow.loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : !workflow.document ? (
        <Stack spacing={2} sx={{  width: "100%", mx: "auto", pt: 2 }}>
          {workflow.error && <Alert severity="error">{workflow.error}</Alert>}
          {!id && (
            <UploadPanel
              uploading={workflow.uploading}
              progress={workflow.progress}
              provider={workflow.provider}
              onProviderChange={workflow.setProvider}
              onUpload={handleUpload}
            />
          )}
        </Stack>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 520, lg: 0 },
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1.45fr) minmax(380px, 0.85fr)"
            },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "background.paper"
          }}
        >
          <DocumentViewer document={workflow.document} />
          <Box
            sx={{
              minWidth: 0,
              borderLeft: { lg: "1px solid" },
              borderColor: { lg: "divider" },
              overflow: "hidden"
            }}
          >
            {workflow.error && (
              <Alert severity="error" sx={{ borderRadius: 0 }}>
                {workflow.error}
              </Alert>
            )}
            <ExtractedFieldsForm
              document={workflow.document}
              saving={workflow.saving}
              saved={workflow.saved}
              onSave={workflow.save}
            />
          </Box>
        </Box>
      )}
    </Stack>
  );
};
