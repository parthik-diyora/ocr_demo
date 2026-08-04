import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { DocumentViewer } from "../components/DocumentViewer";
import { ExtractedFieldsForm } from "../components/ExtractedFieldsForm";
import { UploadPanel } from "../components/UploadPanel";
import { useDocumentWorkflow } from "../hooks/useDocumentWorkflow";

export const DocumentWorkspace = () => {
  const workflow = useDocumentWorkflow();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              mr: 1.5
            }}
          >
            DR
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Document review
            </Typography>
          </Box>
          {workflow.document && (
            <Button
              variant="outlined"
              startIcon={<AddOutlinedIcon />}
              onClick={workflow.reset}
            >
              New document
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {!workflow.document ? (
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
          <Stack spacing={2}>
            {workflow.error && (
              <Alert severity="error">{workflow.error}</Alert>
            )}
            <UploadPanel
              uploading={workflow.uploading}
              progress={workflow.progress}
              provider={workflow.provider}
              onProviderChange={workflow.setProvider}
              onUpload={workflow.upload}
            />
          </Stack>
        </Container>
      ) : (
        <Box
          sx={{
            height: { lg: "calc(100vh - 65px)" },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) minmax(420px, 0.85fr)" },
            overflow: { lg: "hidden" }
          }}
        >
          <DocumentViewer document={workflow.document} />
          <Box
            sx={{
              minWidth: 0,
              bgcolor: "background.paper",
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
    </Box>
  );
};

