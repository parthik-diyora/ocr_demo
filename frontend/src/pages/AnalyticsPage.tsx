import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SpeedIcon from "@mui/icons-material/Speed";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography
} from "@mui/material";

const summaryStats = [
  {
    label: "Documents processed",
    value: "128",
    hint: "Last 30 days",
    icon: <UploadFileOutlinedIcon color="primary" />
  },
  {
    label: "Pending review",
    value: "14",
    hint: "Awaiting user edits",
    icon: <HourglassEmptyIcon color="warning" />
  },
  {
    label: "Reviewed",
    value: "97",
    hint: "Saved corrections",
    icon: <CheckCircleOutlineIcon color="success" />
  },
  {
    label: "Avg. OCR confidence",
    value: "91%",
    hint: "Dummy sample metric",
    icon: <SpeedIcon color="primary" />
  }
];

const engineMix = [
  { label: "Google Document AI", value: 68 },
  { label: "Local OCR", value: 32 }
];

const weeklyVolume = [
  { day: "Mon", count: 12 },
  { day: "Tue", count: 18 },
  { day: "Wed", count: 9 },
  { day: "Thu", count: 22 },
  { day: "Fri", count: 16 },
  { day: "Sat", count: 7 },
  { day: "Sun", count: 5 }
];

const maxWeekly = Math.max(...weeklyVolume.map((item) => item.count));

export const AnalyticsPage = () => {
  return (
    <Stack spacing={3}>
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
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            High-level processing metrics for this document workspace.
          </Typography>
        </Box>
        <Chip
          icon={<AssessmentOutlinedIcon />}
          label="Demo data"
          color="warning"
          variant="outlined"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)"
          }
        }}
      >
        {summaryStats.map((stat) => (
          <Card key={stat.label} variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1.5
                }}
              >
                {stat.icon}
                <TrendingUpIcon fontSize="small" color="disabled" />
              </Box>
              <Typography variant="h4" fontWeight={800}>
                {stat.value}
              </Typography>
              <Typography variant="body2" fontWeight={700} mt={0.5}>
                {stat.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.hint}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" }
        }}
      >
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Weekly upload volume
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1.5,
              height: 160,
              px: 0.5
            }}
          >
            {weeklyVolume.map((item) => (
              <Box
                key={item.day}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  height: "100%",
                  justifyContent: "flex-end"
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.count}
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 36,
                    height: `${Math.max(12, (item.count / maxWeekly) * 100)}%`,
                    bgcolor: "primary.main",
                    borderRadius: 1,
                    opacity: 0.85
                  }}
                />
                <Typography variant="caption" fontWeight={700}>
                  {item.day}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            OCR engine mix
          </Typography>
          <Stack spacing={2.5}>
            {engineMix.map((item) => (
              <Box key={item.label}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.75
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.value}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.value}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary">
              Figures are placeholders until live aggregation is connected.
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
};
