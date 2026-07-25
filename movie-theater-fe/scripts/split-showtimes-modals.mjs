import fs from 'fs';

const pagePath = 'src/features/admin/pages/ShowtimesPage.jsx';
const s = fs.readFileSync(pagePath, 'utf8');
const startAuto = s.indexOf('{/* ==================== CREATE SHOWTIME MODAL');
const startCreate = s.indexOf('{isModalOpen && (');

if (startAuto < 0 || startCreate < 0) {
  console.error('markers not found', startAuto, startCreate);
  process.exit(1);
}

const autoInner = s.slice(startAuto, startCreate)
  .replace('{/* ==================== CREATE SHOWTIME MODAL ==================== */}\n      ', '')
  .trim()
  .replace(/^\{isAutoModalOpen && \(/, '')
  .replace(/\)\}\s*$/, '');

const createInner = s.slice(startCreate, s.lastIndexOf('    </AdminPage>'))
  .trim()
  .replace(/^\{isModalOpen && \(/, '')
  .replace(/\)\}\s*$/, '');

const autoModal = `import React from 'react';
import { X, CalendarDays, Clock, Film, Search } from 'lucide-react';
import { cinemaService } from '../../../../shared/services/cinemaService';
import { formatTimeOnly, formatDateShort, formatWeekday } from './showtimesConstants';

const ShowtimesAutoModal = ({
  onClose,
  isAutoPreviewOpen,
  autoFormData,
  setAutoFormData,
  cinemas,
  rooms,
  setRooms,
  movies,
  handleAutoSubmit,
  previewGenerated,
  selectedPreviewUuids,
  togglePreviewSelection,
  handleSaveAuto,
  isAutoLoading,
  isSavingAuto,
  setIsAutoPreviewOpen,
}) => (
${autoInner.replace(/\bonClick=\{\(\) => \{\s*setIsAutoModalOpen\(false\);\s*setIsAutoPreviewOpen\(false\);\s*\}\}/g, 'onClick={onClose}')}
);

export default ShowtimesAutoModal;
`;

const createModal = `import React from 'react';
import { X, Plus, Film, Search, ChevronDown } from 'lucide-react';

const ShowtimesCreateModal = ({
  onClose,
  formData,
  setFormData,
  cinemas,
  rooms,
  movies,
  filteredMovies,
  selectedMovie,
  isLoadingMovies,
  isMovieDropdownOpen,
  setIsMovieDropdownOpen,
  searchMovieKeyword,
  setSearchMovieKeyword,
  handleCinemaChange,
  handleSubmit,
}) => (
${createInner.replace(/\bonClick=\{\(\) => setIsModalOpen\(false\)\}/g, 'onClick={onClose}')}
);

export default ShowtimesCreateModal;
`;

fs.writeFileSync('src/features/admin/pages/showtimes/ShowtimesAutoModal.jsx', autoModal);
fs.writeFileSync('src/features/admin/pages/showtimes/ShowtimesCreateModal.jsx', createModal);

const replacement = `      {isAutoModalOpen && (
        <Suspense fallback={null}>
          <ShowtimesAutoModal
            onClose={() => { setIsAutoModalOpen(false); setIsAutoPreviewOpen(false); }}
            isAutoPreviewOpen={isAutoPreviewOpen}
            autoFormData={autoFormData}
            setAutoFormData={setAutoFormData}
            cinemas={cinemas}
            rooms={rooms}
            setRooms={setRooms}
            movies={movies}
            handleAutoSubmit={handleAutoSubmit}
            previewGenerated={previewGenerated}
            selectedPreviewUuids={selectedPreviewUuids}
            togglePreviewSelection={togglePreviewSelection}
            handleSaveAuto={handleSaveAuto}
            isAutoLoading={isAutoLoading}
            isSavingAuto={isSavingAuto}
            setIsAutoPreviewOpen={setIsAutoPreviewOpen}
          />
        </Suspense>
      )}
      {isModalOpen && (
        <Suspense fallback={null}>
          <ShowtimesCreateModal
            onClose={() => setIsModalOpen(false)}
            formData={formData}
            setFormData={setFormData}
            cinemas={cinemas}
            rooms={rooms}
            movies={movies}
            filteredMovies={filteredMovies}
            selectedMovie={selectedMovie}
            isLoadingMovies={isLoadingMovies}
            isMovieDropdownOpen={isMovieDropdownOpen}
            setIsMovieDropdownOpen={setIsMovieDropdownOpen}
            searchMovieKeyword={searchMovieKeyword}
            setSearchMovieKeyword={setSearchMovieKeyword}
            handleCinemaChange={handleCinemaChange}
            handleSubmit={handleSubmit}
          />
        </Suspense>
      )}
`;

const newMain = s.slice(0, startAuto) + replacement + s.slice(s.lastIndexOf('    </AdminPage>'));
fs.writeFileSync(pagePath, newMain);
console.log('Extracted modals');
