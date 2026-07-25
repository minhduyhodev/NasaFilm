import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link2, Loader2 } from 'lucide-react';
import { orbitService } from '../../../shared/services/orbitService';
import './OrbitJoinInput.css';

const OrbitJoinInput = ({ autoFocus = false }) => {
  const [linkInput, setLinkInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    const input = linkInput.trim();
    if (!input) {
      setJoinError('Vui lòng nhập mã phòng (8 ký tự) hoặc dán link Orbit để tham gia.');
      return;
    }

    setJoinError('');
    setLoading(true);
    try {
      let code = input;
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const match = input.match(uuidRegex);
      if (match) {
        code = match[0];
      } else {
        const parts = input.split('/');
        const lastPart = parts[parts.length - 1]?.trim();
        if (lastPart) {
          code = lastPart;
        }
      }

      const shortCodeRegex = /^[0-9a-f]{8}$/i;
      if (!uuidRegex.test(code) && !shortCodeRegex.test(code)) {
        setJoinError('Mã phòng không hợp lệ. Nhập 8 ký tự hoặc dán link mời Orbit.');
        return;
      }

      const res = await orbitService.resolveRoomCode(code);
      if (res && res.roomUuid) {
        navigate(`/booking/orbit/${res.roomUuid}`);
      } else {
        setJoinError('Không tìm thấy phòng Orbit hoặc phòng đã hết hạn.');
      }
    } catch (err) {
      setJoinError(err.message || 'Mã phòng hoặc đường dẫn Orbit không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="orbit-join-bar">
      <div className="orbit-join-bar__head">
        <Link2 aria-hidden />
        <span className="orbit-join-bar__title">Tham gia phòng Orbit</span>
      </div>

      <p className="orbit-join-bar__desc">
        Nhập mã 8 ký tự hoặc dán link mời để vào phòng đặt vé nhóm.
      </p>

      <div className="orbit-join-bar__field">
        <input
          type="text"
          className="orbit-join-bar__input"
          placeholder="Mã phòng hoặc link mời..."
          value={linkInput}
          autoFocus={autoFocus}
          onChange={(e) => {
            setLinkInput(e.target.value);
            if (joinError) setJoinError('');
          }}
          disabled={loading}
          aria-label="Mã phòng hoặc link mời Orbit"
        />
        <button
          type="submit"
          className="orbit-join-bar__submit"
          disabled={loading || !linkInput.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <span>Tham gia</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {joinError && <p className="orbit-join-bar__error">{joinError}</p>}
    </form>
  );
};

export default OrbitJoinInput;
