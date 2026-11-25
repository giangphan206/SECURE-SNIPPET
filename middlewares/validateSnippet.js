const MAX_CONTENT_BYTES = 10 * 1024;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSnippet(req, res, next) {
  const { title, content, maxViews, expiresAt, isPrivate } = req.body ?? {};
  const isCreate = req.method === "POST";

  if (isCreate) {
    if (!isNonEmptyString(title)) {
      return res.status(400).json({ message: "Title is required and must not be empty." });
    }
    if (!isNonEmptyString(content)) {
      return res.status(400).json({ message: "Content is required and must not be empty." });
    }
  } else {
    const hasUpdatableField =
      title !== undefined ||
      content !== undefined ||
      maxViews !== undefined ||
      expiresAt !== undefined ||
      isPrivate !== undefined;

    if (!hasUpdatableField) {
      return res.status(400).json({ message: "At least one field must be provided for update." });
    }

    if (title !== undefined && !isNonEmptyString(title)) {
      return res.status(400).json({ message: "Title must not be empty." });
    }

    if (content !== undefined && !isNonEmptyString(content)) {
      return res.status(400).json({ message: "Content must not be empty." });
    }
  }

  if (content !== undefined) {
    const size = Buffer.byteLength(String(content), "utf8");
    if (size > MAX_CONTENT_BYTES) {
      return res.status(400).json({
        message: `Content size must not exceed ${MAX_CONTENT_BYTES} bytes (10KB).`,
      });
    }
  }

  if (maxViews !== undefined && maxViews !== null) {
    const value = Number(maxViews);
    if (!Number.isInteger(value) || value < 0) {
      return res.status(400).json({ message: "maxViews must be a non-negative integer or null." });
    }
  }

  if (expiresAt !== undefined && expiresAt !== null) {
    const time = new Date(expiresAt).getTime();
    if (!Number.isFinite(time)) {
      return res.status(400).json({ message: "expiresAt must be a valid date or null." });
    }
  }

  if (isPrivate !== undefined && typeof isPrivate !== "boolean") {
    return res.status(400).json({ message: "isPrivate must be a boolean." });
  }

  next();
}
