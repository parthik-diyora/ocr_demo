import { useRef, useState } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material";

interface UploadPanelProps {
  uploading: boolean;
  progress: number;
  onUpload: (file: File) => void;
}

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export const UploadPanel = ({
  uploading,
  progress,
  onUpload
}: UploadPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const useFile = (file?: File) => {
    if (file && ACCEPTED_TYPES.includes(file.type)) onUpload(file);
  };

  return (
    <Box
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        useFile(event.dataTransfer.files[0]);
      }}
      sx={{
        minHeight: 320,
        border: "1px dashed",
        borderColor: dragging ? "primary.main" : "divider",
        bgcolor: dragging ? "primary.light" : "background.paper",
        display: "grid",
        placeItems: "center",
        p: 4
      }}
    >
      <Stack spacing={2.25} alignItems="center" sx={{ maxWidth: 440 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            display: "grid",
            placeItems: "center",
            bgcolor: "secondary.light",
            color: "secondary.dark",
            borderRadius: 1
          }}
        >
          <DescriptionOutlinedIcon fontSize="large" />
        </Box>
        <Box textAlign="center">
          <Typography variant="h5" component="h1">
            Upload a claim form
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            PDF, PNG, JPG, or JPEG up to 20 MB
          </Typography>
        </Box>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => useFile(event.target.files?.[0])}
        />
        <Button
          variant="contained"
          startIcon={<CloudUploadOutlinedIcon />}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Select document
        </Button>
        {uploading && (
          <Box sx={{ width: "100%" }}>
            <LinearProgress
              variant={progress < 100 ? "determinate" : "indeterminate"}
              value={progress}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "center", mt: 1 }}
            >
              {progress < 100
                ? `Uploading ${progress}%`
                : "Processing document with OCR"}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};
