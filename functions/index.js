const {
  MAIL_TO, MAIL_FROM,
  buildHtml, isValidEmail, isValidPhone,
  createTransporter, handleCors, parseMultipart, isRateLimited
} = require('./shared');

const HONEYPOT = 'website';

const FIELD_MAX = {
  firstName: 60, lastName: 60, email: 254, phone: 20,
  address: 200, propertyType: 60, fenceType: 60, linearFeet: 30,
  fenceHeight: 30, postSpacing: 30, numGates: 10, gateWidth: 40,
  colorFinish: 40, panelStyle: 40, message: 2000
};

exports.sendQuote = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });

  const { fields } = await parseMultipart(req);
  if (fields[HONEYPOT]) return res.status(400).json({ error: 'Spam detected.' });

  // Truncate all fields to their max lengths
  for (const [key, max] of Object.entries(FIELD_MAX)) {
    if (fields[key]) fields[key] = String(fields[key]).slice(0, max);
  }

  const {
    firstName, lastName, email, phone, address,
    propertyType, fenceType, linearFeet,
    fenceHeight, postSpacing, numGates, gateWidth,
    colorFinish, panelStyle, message
  } = fields;

  if (!firstName?.trim())                           return res.status(400).json({ error: 'First name is required.' });
  if (!isValidEmail(email?.trim()))                 return res.status(400).json({ error: 'A valid email is required.' });
  if (!phone?.trim())                               return res.status(400).json({ error: 'Phone number is required.' });
  if (!isValidPhone(phone.trim()))                  return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });

  try {
    await createTransporter().sendMail({
      from:    MAIL_FROM,
      to:      MAIL_TO,
      replyTo: email,
      subject: `New Quote Request from ${firstName} ${lastName || ''}`.trim(),
      html: buildHtml('New Quote Request — Global Direct Fence', {
        firstName, lastName, email, phone, address,
        propertyType, fenceType, linearFeet,
        fenceHeight, postSpacing, numGates, gateWidth,
        colorFinish, panelStyle, message
      })
    });
    res.json({ success: true });
  } catch (err) {
    console.error('sendQuote:', err);
    res.status(500).json({ error: 'Unable to send your request. Please try again.' });
  }
};
