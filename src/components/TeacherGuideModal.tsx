import React from 'react';
import { HelpCircle, X, BookOpen, Clock, Users, Sparkles, Database, Monitor, CheckCircle } from 'lucide-react';

interface TeacherGuideModalProps {
  onClose: () => void;
}

export const TeacherGuideModal: React.FC<TeacherGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-blue-950 flex items-center justify-center shadow-md">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-950 uppercase">
                Hướng dẫn giáo viên sử dụng trong giờ dạy Tin học
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Tổ chức trò chơi học tập môn Tin học Lớp 3, 4, 5 theo Chương trình GDPT 2018
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
            <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-700" /> 1. Chuẩn bị và hiển thị trên máy chiếu / màn hình TV lớp học
            </h3>
            <p>
              • Nhấn nút <strong>Toàn màn hình</strong> (hoặc phím tắt <kbd className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">F11</kbd>) ở thanh tiêu đề để mở rộng màn hình chiếu tối đa, giúp cả lớp dễ dàng quan sát các câu hỏi và đồng hồ đếm ngược.
            </p>
            <p>
              • Bật hệ thống loa của phòng máy tính hoặc loa lớp học để phát âm thanh chuông vàng, tiếng tích tắc đếm ngược và nhạc chào mừng khi kết thúc vòng thi.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" /> 2. Quy trình 8 bước tổ chức vòng thi cho từng bài học
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Bước 1 (Chọn Khối lớp):</strong> Nhấp chọn Lớp 3, Lớp 4 hoặc Lớp 5 trên thanh tiêu đề hoặc ở bước 1.</li>
              <li><strong>Bước 2 (Chọn Bộ sách):</strong> Chọn bộ sách đang dùng (Kết nối tri thức, Cánh Diều, Chân trời sáng tạo hoặc thêm bộ sách khác).</li>
              <li><strong>Bước 3 (Chọn Bài học):</strong> Lọc theo chủ đề hoặc tìm kiếm bài cần dạy (ví dụ: "Bài 3: Máy tính và em").</li>
              <li><strong>Bước 4 (Chọn Bộ đề):</strong> Chọn bộ đề phù hợp với tiến trình tiết dạy (Khởi động, Luyện tập, Vận dụng, hoặc Ôn tập cuối bài).</li>
              <li><strong>Bước 5 (Tùy chỉnh số lượng):</strong> Giáo viên có thể chọn nhanh 5, 10 câu, nhập số lượng tùy ý hoặc chọn thủ công từng câu phù hợp với thời gian còn lại của tiết học.</li>
              <li><strong>Bước 6 (Tùy chỉnh thời gian):</strong> Chọn thời gian chung (ví dụ 15s, 20s, 30s) hoặc thời gian riêng từng câu (tối đa 60 giây).</li>
              <li><strong>Bước 7 (Chế độ thi đấu):</strong> Lựa chọn hình thức Cá nhân, Nhiều bạn cùng chơi hoặc Chia đội (2 đến 6 đội).</li>
              <li><strong>Bước 8 (Khai mạc):</strong> Rà soát bản tóm tắt và bấm <strong>BẮT ĐẦU VÒNG THI</strong>!</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" /> 3. Kinh nghiệm tổ chức thi đấu theo đội trong lớp học
            </h3>
            <p>
              • Chia lớp thành 2 đến 6 đội (ví dụ: Tổ 1, Tổ 2, Tổ 3, Tổ 4 hoặc Đội Vàng, Đội Xanh, Đội Đỏ).
            </p>
            <p>
              • Khi câu hỏi xuất hiện, cả lớp có thời gian suy nghĩ thảo luận. Học sinh giơ bảng nhóm hoặc rung chuông phụ. Giáo viên chọn tên đội đã giơ bảng trước và nhấp chọn đáp án đội đó đưa ra.
            </p>
            <p>
              • Hệ thống sẽ tự động cộng điểm cho đội đó và cập nhật bảng điểm trực tiếp trên máy chiếu.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
            <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-700" /> 4. Tạo câu hỏi bài học bằng Trợ lý AI
            </h3>
            <p>
              • Bấm vào mục <strong>Tạo bằng AI</strong> trên thanh công cụ.
            </p>
            <p>
              • Dán nội dung tóm tắt bài học hoặc các yêu cầu cần đạt từ kế hoạch bài dạy (giáo án) vào ô văn bản.
            </p>
            <p>
              • Chọn số lượng câu hỏi và nhấn Tạo. Giáo viên xem trước từng câu, chỉnh sửa từ ngữ cho thân thuộc với học sinh lớp mình và nhấn <strong>Xác nhận lưu vào bộ đề</strong>.
            </p>
          </div>

          {/* Section 5 */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-700" /> 5. Quản lý, lưu trữ và sao lưu dữ liệu
            </h3>
            <p>
              • Mọi câu hỏi và thiết lập mới sẽ tự động lưu vào trình duyệt máy tính của bạn.
            </p>
            <p>
              • Vào mục <strong>Dữ liệu</strong> &gt; bấm <strong>Xuất bộ câu hỏi</strong> để lưu tệp <code className="bg-white px-1 py-0.5 rounded border border-gray-300">.json</code> vào USB hoặc Google Drive. Khi sang máy tính khác, chỉ cần bấm <strong>Nhập bộ câu hỏi</strong> là có thể sử dụng ngay lập tức!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-900 text-amber-300 hover:bg-blue-800 font-bold text-xs shadow"
          >
            Đã hiểu, sẵn sàng dạy học!
          </button>
        </div>
      </div>
    </div>
  );
};
