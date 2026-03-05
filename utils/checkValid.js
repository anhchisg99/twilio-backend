const twilio = require('twilio')
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
async function checkPhoneNumber(phoneNumber) {
  try {
    // phoneNumber nên ở định dạng E.164 (ví dụ: +84912345678)
    const phoneRecord = await client.lookups.v2
      .phoneNumbers(phoneNumber)
      .fetch();

    if (phoneRecord.valid) {
      console.log(`Số điện thoại hợp lệ: ${phoneRecord.phoneNumber}`);
      return true;
    }
  } catch (error) {
    // Nếu số điện thoại không tồn tại hoặc sai định dạng, Twilio sẽ trả về lỗi 404
    if (error.status === 404) {
      console.error("Số điện thoại không tồn tại hoặc sai định dạng.");
    } else {
      console.error("Lỗi hệ thống:", error.message);
    }
    return false;
  }
}
module.exports = checkPhoneNumber