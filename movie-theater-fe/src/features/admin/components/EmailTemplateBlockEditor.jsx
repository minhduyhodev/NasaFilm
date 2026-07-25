import { useMemo } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Table2, Trash2, Type } from 'lucide-react';
import {
  createFieldBlock,
  createInfoTableBlock,
  createParagraphBlock,
  createTextBlock,
  getFieldLabel,
  getFieldMeta,
  getFieldOptions,
  previewBlockLabel,
} from '../utils/emailTemplateUtils';
import './EmailTemplateBlockEditor.css';

const BLOCK_TYPE_LABELS = {
  text: 'Đoạn văn bản',
  paragraph: 'Đoạn có chèn trường',
  field: 'Trường dữ liệu',
  info_table: 'Bảng thông tin',
};

const FieldSelect = ({ value, onChange, options, id }) => (
  <select id={id} className="etb-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">— Chọn trường dữ liệu —</option>
    {options.map((opt) => (
      <option key={opt.key} value={opt.key}>
        {opt.label}
      </option>
    ))}
  </select>
);

const ParagraphPartsEditor = ({ block, options, onChange }) => {
  const parts = block.parts?.length ? block.parts : [{ type: 'text', value: '' }];

  const updatePart = (index, nextPart) => {
    const next = parts.map((part, i) => (i === index ? nextPart : part));
    onChange({ ...block, parts: next });
  };

  const addTextPart = () => {
    onChange({ ...block, parts: [...parts, { type: 'text', value: '' }] });
  };

  const addFieldPart = (key) => {
    if (!key) return;
    onChange({ ...block, parts: [...parts, { type: 'field', key }] });
  };

  const removePart = (index) => {
    const next = parts.filter((_, i) => i !== index);
    onChange({ ...block, parts: next.length ? next : [{ type: 'text', value: '' }] });
  };

  return (
    <div className="etb-parts">
      {parts.map((part, index) => (
        <div key={`${block.id}-part-${index}`} className="etb-part">
          {part.type === 'field' ? (
            <span className="etb-field-chip">{getFieldLabel(part.key)}</span>
          ) : (
            <input
              className="etb-input"
              value={part.value || ''}
              onChange={(e) => updatePart(index, { ...part, value: e.target.value })}
              placeholder="Nhập nội dung văn bản..."
            />
          )}
          <button type="button" className="etb-icon-btn" onClick={() => removePart(index)} aria-label="Xóa phần">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="etb-part-actions">
        <button type="button" className="etb-mini-btn" onClick={addTextPart}>
          <Type size={13} />
          Thêm chữ
        </button>
        <FieldSelect
          value=""
          options={options}
          onChange={(key) => addFieldPart(key)}
        />
      </div>
    </div>
  );
};

const InfoTableEditor = ({ block, options, onChange }) => {
  const rows = block.rows?.length ? block.rows : [{ label: '', key: options[0]?.key || '' }];

  const updateRow = (index, patch) => {
    onChange({
      ...block,
      rows: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const addRow = () => {
    onChange({ ...block, rows: [...rows, { label: 'Nhãn', key: options[0]?.key || '' }] });
  };

  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index);
    onChange({ ...block, rows: next.length ? next : [{ label: '', key: options[0]?.key || '' }] });
  };

  return (
    <div className="etb-table-editor">
      {rows.map((row, index) => (
        <div key={`${block.id}-row-${index}`} className="etb-table-row">
          <input
            className="etb-input"
            value={row.label || ''}
            onChange={(e) => updateRow(index, { label: e.target.value })}
            placeholder="Nhãn hiển thị"
          />
          <FieldSelect
            value={row.key}
            options={options}
            onChange={(key) => updateRow(index, { key })}
          />
          <button type="button" className="etb-icon-btn" onClick={() => removeRow(index)} aria-label="Xóa dòng">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="etb-mini-btn" onClick={addRow}>
        <Plus size={13} />
        Thêm dòng
      </button>
    </div>
  );
};

const BlockCard = ({ block, index, total, options, onChange, onRemove, onMove }) => {
  const meta = block.type === 'field' ? getFieldMeta(block.key) : null;

  return (
    <article className="etb-block">
      <div className="etb-block__head">
        <GripVertical size={14} className="etb-block__grip" aria-hidden />
        <div className="etb-block__title-wrap">
          <span className="etb-block__index">#{index + 1}</span>
          <strong className="etb-block__title">{BLOCK_TYPE_LABELS[block.type] || block.type}</strong>
          <span className="etb-block__subtitle">{previewBlockLabel(block)}</span>
        </div>
        <div className="etb-block__actions">
          <button type="button" className="etb-icon-btn" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Di chuyển lên">
            <ChevronUp size={14} />
          </button>
          <button type="button" className="etb-icon-btn" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label="Di chuyển xuống">
            <ChevronDown size={14} />
          </button>
          <button type="button" className="etb-icon-btn etb-icon-btn--danger" onClick={() => onRemove(index)} aria-label="Xóa khối">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="etb-block__body">
        {block.type === 'text' && (
          <textarea
            className="etb-textarea"
            value={block.value || ''}
            onChange={(e) => onChange({ ...block, value: e.target.value })}
            placeholder="Nhập nội dung văn bản thường..."
            rows={3}
          />
        )}

        {block.type === 'paragraph' && (
          <ParagraphPartsEditor block={block} options={options} onChange={onChange} />
        )}

        {block.type === 'field' && (
          <div className="etb-field-block">
            <FieldSelect
              value={block.key}
              options={options}
              onChange={(key) => onChange({ ...block, key })}
            />
            {meta && (
              <p className="etb-hint">
                Hiển thị dạng {meta.style === 'link' ? 'nút liên kết' : meta.style === 'highlight' ? 'mã nổi bật' : meta.style === 'html_block' ? 'khối HTML hệ thống' : 'văn bản thường'}.
              </p>
            )}
          </div>
        )}

        {block.type === 'info_table' && (
          <InfoTableEditor block={block} options={options} onChange={onChange} />
        )}
      </div>
    </article>
  );
};

const EmailTemplateBlockEditor = ({ templateCode, blocks, onChange }) => {
  const options = useMemo(() => getFieldOptions(templateCode), [templateCode]);

  const updateBlock = (index, nextBlock) => {
    onChange(blocks.map((block, i) => (i === index ? nextBlock : block)));
  };

  const removeBlock = (index) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addBlock = (factory) => {
    onChange([...blocks, factory()]);
  };

  return (
    <div className="etb-editor">
      <div className="etb-editor__toolbar">
        <span className="etb-editor__label">Nội dung email</span>
        <div className="etb-editor__add-group">
          <button type="button" className="etb-add-btn" onClick={() => addBlock(() => createTextBlock(''))}>
            <Type size={13} />
            Đoạn văn
          </button>
          <button type="button" className="etb-add-btn" onClick={() => addBlock(() => createParagraphBlock())}>
            <Plus size={13} />
            Đoạn chèn trường
          </button>
          <button
            type="button"
            className="etb-add-btn"
            onClick={() => addBlock(() => createFieldBlock(options[0]?.key || 'CUSTOMER_NAME'))}
          >
            <Plus size={13} />
            Trường dữ liệu
          </button>
          {templateCode === 'THEATER_TICKET' && (
            <button type="button" className="etb-add-btn" onClick={() => addBlock(() => createInfoTableBlock())}>
              <Table2 size={13} />
              Bảng thông tin
            </button>
          )}
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="etb-empty">Chưa có nội dung. Thêm đoạn văn hoặc chọn trường dữ liệu để bắt đầu.</p>
      ) : (
        <div className="etb-blocks">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              options={options}
              onChange={(next) => updateBlock(index, next)}
              onRemove={removeBlock}
              onMove={moveBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplateBlockEditor;
