import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
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
import type { ReactNode } from "react";

type IntegrationKind = "teams" | "email";

const copy: Record<
  IntegrationKind,
  {
    title: string;
    description: string;
    icon: ReactNode;
    cta: string;
  }
> = {
  teams: {
    title: "Microsoft Teams",
    description:
      "Connect a Teams channel to receive claim documents and route them into OCR review. This integration is a placeholder for now.",
    icon: <GroupsOutlinedIcon color="primary" sx={{ fontSize: 40 }} />,
    cta: "Connect Teams"
  },
  email: {
    title: "Email",
    description:
      "Forward claim form attachments from a monitored inbox into the document pipeline. This integration is a placeholder for now.",
    icon: <EmailOutlinedIcon color="primary" sx={{ fontSize: 40 }} />,
    cta: "Connect Email"
  }
};

export const IntegrationsPage = ({ kind }: { kind: IntegrationKind }) => {
  const item = copy[kind];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Integration settings
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {item.icon}
              <Chip label="Coming soon" size="small" color="warning" />
            </Box>
            <Typography variant="body1">{item.description}</Typography>
            <Typography variant="body2" color="text.secondary">
              No credentials or webhooks are configured yet. Use Upload Document
              for the live OCR workflow today.
            </Typography>
          </Stack>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" disabled>
            {item.cta}
          </Button>
        </CardActions>
      </Card>
    </Stack>
  );
};
