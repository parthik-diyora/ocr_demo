import { useState } from "react";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import type { ExtractedDocument } from "../types/document";

interface DocumentViewerProps {
  document: ExtractedDocument;
}

export const DocumentViewer = ({ document }: DocumentViewerProps) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const isPdf = document.fileType === "application/pdf";
  const firstPage = document.ocr.pages[0];

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: { xs: 520, lg: 0 },
        bgcolor: "#dfe3e6",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          minHeight: 52,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider"
        }}
      >
        <Box>
          <Typography variant="subtitle2">Source document</Typography>
          <Typography variant="caption" color="text.secondary">
            {document.ocr.pages.length} page
            {document.ocr.pages.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        {!isPdf && (
          <Tooltip title={showBoxes ? "Hide OCR boxes" : "Show OCR boxes"}>
            <IconButton onClick={() => setShowBoxes((value) => !value)}>
              {showBoxes ? (
                <VisibilityOutlinedIcon />
              ) : (
                <VisibilityOffOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Box sx={{ flex: 1, overflow: "auto", p: { xs: 1.5, md: 3 } }}>
        {isPdf ? (
          <Box
            component="iframe"
            title="Uploaded PDF"
            src={document.fileUrl}
            sx={{
              border: 0,
              width: "100%",
              height: "100%",
              minHeight: 600,
              bgcolor: "white"
            }}
          />
        ) : (
          <Box
            sx={{
              position: "relative",
              width: "fit-content",
              maxWidth: "100%",
              mx: "auto",
              lineHeight: 0,
              boxShadow: 3
            }}
          >
            <Box
              component="img"
              src={document.fileUrl}
              alt="Uploaded insurance claim form"
              sx={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
            {showBoxes &&
              firstPage?.text.map((item, index) => {
                const x = item.box.map(([value]) => value);
                const y = item.box.map(([, value]) => value);
                const left = (Math.min(...x) / firstPage.width) * 100;
                const top = (Math.min(...y) / firstPage.height) * 100;
                const width =
                  ((Math.max(...x) - Math.min(...x)) / firstPage.width) * 100;
                const height =
                  ((Math.max(...y) - Math.min(...y)) / firstPage.height) * 100;
                return (
                  <Tooltip
                    key={`${item.text}-${index}`}
                    title={`${item.text} · ${Math.round(item.confidence * 100)}%`}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        border: "1px solid",
                        borderColor:
                          item.confidence < 0.8 ? "warning.main" : "info.main",
                        bgcolor:
                          item.confidence < 0.8
                            ? "rgba(237, 108, 2, 0.10)"
                            : "rgba(2, 136, 209, 0.08)",
                        cursor: "help"
                      }}
                    />
                  </Tooltip>
                );
              })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

