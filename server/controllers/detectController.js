const DEFAULT_CATEGORY = 'Other';

const CATEGORY_KEYWORDS = {
  Sanitation: [
    'garbage', 'trash', 'waste', 'plastic', 'bag', 'bottle', 'cup', 'can', 'bin', 'dump', 'litter',
  ],
  Water: [
    'water', 'leak', 'pipe', 'drain', 'overflow', 'seepage', 'puddle', 'wet', 'sink', 'toilet', 'tap',
  ],
  Roads: [
    'road', 'pothole', 'asphalt', 'street', 'crack',
  ],
  Traffic: [
    'car', 'bus', 'truck', 'motorcycle', 'bicycle', 'traffic', 'signal',
  ],
  Electricity: [
    'wire', 'pole', 'light', 'lamp', 'bulb',
  ],
};

const mapLabelsToCategory = (labels = [], extraText = '') => {
  const joined = `${labels.join(' ')} ${extraText || ''}`.toLowerCase();

  let bestCategory = DEFAULT_CATEGORY;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (joined.includes(keyword)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : DEFAULT_CATEGORY;
};

const fallbackDetection = (fileName = '') => {
  const fileLower = String(fileName).toLowerCase();
  const labels = [];

  if (fileLower.includes('garbage') || fileLower.includes('waste')) labels.push('garbage');
  if (fileLower.includes('water') || fileLower.includes('leak')) labels.push('water leak');
  if (fileLower.includes('road') || fileLower.includes('pothole')) labels.push('road damage');
  if (fileLower.includes('traffic') || fileLower.includes('car')) labels.push('car');

  const normalizedLabels = labels.length ? labels : ['civic issue'];
  const category = mapLabelsToCategory(normalizedLabels, fileName);

  return {
    labels: normalizedLabels,
    category,
    confidence: 0.55,
    boxes: [],
    source: 'fallback',
  };
};

exports.detectIssueFromImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const yoloApiUrl = process.env.YOLO_API_URL || 'http://127.0.0.1:8000/detect';

    try {
      const form = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
      form.append('image', blob, req.file.originalname || 'upload.jpg');

      const response = await fetch(yoloApiUrl, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error(`YOLO service responded with ${response.status}`);
      }

      const aiResult = await response.json();
      const labels = Array.isArray(aiResult.labels) ? aiResult.labels : [];
      const inferredCategory = mapLabelsToCategory(labels, req.file.originalname);
      const rawCategory = aiResult.category || '';
      const isRawOther = String(rawCategory).toLowerCase() === 'other';
      const category = !rawCategory || isRawOther ? inferredCategory : rawCategory;
      const confidence = Number(aiResult.confidence || 0);

      return res.json({
        success: true,
        result: {
          labels,
          category,
          confidence: Number.isFinite(confidence) ? confidence : 0,
          boxes: Array.isArray(aiResult.boxes) ? aiResult.boxes : [],
          source: 'yolo',
        },
      });
    } catch {
      const result = fallbackDetection(req.file.originalname);
      return res.json({ success: true, result });
    }
  } catch (error) {
    return next(error);
  }
};
