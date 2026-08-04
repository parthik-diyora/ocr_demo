import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography
} from "@mui/material";

const integrations = [
  {
    id: "teams",
    title: "Microsoft Teams",
    description:
      "Connect a Teams channel to receive claim documents and route them into OCR review.",
    icon: <GroupsOutlinedIcon color="primary" sx={{ fontSize: 36 }} />,
    cta: "Connect Teams",
    status: "Not connected"
  },
  {
    id: "email",
    title: "Email",
    description:
      "Forward claim form attachments from a monitored inbox into the document pipeline.",
    icon: <EmailOutlinedIcon color="primary" sx={{ fontSize: 36 }} />,
    cta: "Connect Email",
    status: "Not connected"
  }
] as const;

export const IntegrationsPage = () => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Integrations
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Connect external channels to ingest documents. Placeholders for now —
          upload still works from the app.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }
        }}
      >
        {integrations.map((item) => (
          <Card key={item.id} variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={1.75}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    {item.icon}
                    <Typography variant="h6" fontWeight={700}>
                      {item.title}
                    </Typography>
                  </Box>
                  <Chip label="Coming soon" size="small" color="warning" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status: {item.status}
                </Typography>
              </Stack>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button variant="contained" disabled>
                {item.cta}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
            <HubOutlinedIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              How integrations will work
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Documents arriving from Teams or Email will land in My Documents with
            status pending review, then use the same OCR + field review flow as
            manual uploads.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};
