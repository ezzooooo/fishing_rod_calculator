import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/quote_record.dart';
import '../providers/calculation_provider.dart';

String _money(double value) => '${NumberFormat('#,###').format(value)}원';
String _rodLabel(QuoteItem item) =>
    '${item.brandName.isEmpty ? '' : '[${item.brandName}] '}${item.fishingRodName}';

String formatQuoteText(QuoteRecord record) {
  final buffer = StringBuffer()
    ..writeln(record.title)
    ..writeln('${record.mode.label} 견적');
  if (record.customerName.isNotEmpty) {
    buffer.writeln('고객: ${record.customerName}');
  }
  buffer.writeln();
  for (final item in record.items) {
    buffer
      ..writeln(_rodLabel(item))
      ..writeln(
        '${item.length}칸 · ${item.quantity}대 · 단가 ${_money(item.finalUnitPrice)} · 합계 ${_money(item.totalPrice)}',
      );
  }
  buffer
    ..writeln()
    ..writeln('총 ${record.totalQuantity}대')
    ..writeln('총 견적 금액: ${_money(record.totalPrice)}');
  if (record.note.isNotEmpty) {
    buffer
      ..writeln()
      ..writeln('메모: ${record.note}');
  }
  return buffer.toString().trimRight();
}

class QuoteOutputActions extends StatelessWidget {
  const QuoteOutputActions({super.key, required this.record});

  final QuoteRecord record;

  Future<void> _copy(BuildContext context) async {
    try {
      await Clipboard.setData(ClipboardData(text: formatQuoteText(record)));
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('전체 견적을 복사했습니다.')));
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('복사하지 못했습니다. 다시 시도해주세요.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        OutlinedButton.icon(
          onPressed: record.items.isEmpty
              ? null
              : () => showDialog<void>(
                  context: context,
                  builder: (context) => _QuotePreviewDialog(record: record),
                ),
          icon: const Icon(Icons.description_outlined, size: 18),
          label: const Text('견적서 미리보기'),
        ),
        TextButton.icon(
          onPressed: record.items.isEmpty ? null : () => _copy(context),
          icon: const Icon(Icons.content_copy_outlined, size: 18),
          label: const Text('견적 복사'),
        ),
      ],
    );
  }
}

class _QuotePreviewDialog extends StatefulWidget {
  const _QuotePreviewDialog({required this.record});

  final QuoteRecord record;

  @override
  State<_QuotePreviewDialog> createState() => _QuotePreviewDialogState();
}

class _QuotePreviewDialogState extends State<_QuotePreviewDialog> {
  bool _printing = false;
  String? _error;

  Future<Uint8List> _buildPdf(PdfPageFormat pageFormat) async {
    final fonts = await Future.wait([
      PdfGoogleFonts.nanumGothicRegular(),
      PdfGoogleFonts.nanumGothicBold(),
    ]);
    final record = widget.record;
    final document = pw.Document();
    document.addPage(
      pw.MultiPage(
        pageFormat: pageFormat,
        maxPages: 100,
        margin: const pw.EdgeInsets.all(32),
        theme: pw.ThemeData.withFont(base: fonts[0], bold: fonts[1]),
        build: (context) => [
          pw.Text(
            record.title,
            style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 10),
          pw.Text(
            '${record.mode.label} 견적${record.customerName.isEmpty ? '' : ' · 고객: ${record.customerName}'}',
          ),
          pw.SizedBox(height: 8),
          pw.Text(
            '작성일시: ${DateFormat('yyyy.MM.dd HH:mm').format(record.createdAt.toLocal())}',
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 20),
          pw.TableHelper.fromTextArray(
            headers: const ['낚시대', '칸수', '수량', '최종 단가', '합계'],
            data: [
              for (final item in record.items)
                [
                  _rodLabel(item),
                  '${item.length}칸',
                  '${item.quantity}대',
                  _money(item.finalUnitPrice),
                  _money(item.totalPrice),
                ],
            ],
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              fontSize: 9,
            ),
            cellStyle: const pw.TextStyle(fontSize: 9),
            cellPadding: const pw.EdgeInsets.all(7),
            headerDecoration: const pw.BoxDecoration(color: PdfColors.blue50),
            border: pw.TableBorder.all(color: PdfColors.grey300),
            columnWidths: {
              0: const pw.FlexColumnWidth(2.3),
              1: const pw.FlexColumnWidth(.7),
              2: const pw.FlexColumnWidth(.7),
              3: const pw.FlexColumnWidth(1.2),
              4: const pw.FlexColumnWidth(1.3),
            },
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.center,
              2: pw.Alignment.center,
              3: pw.Alignment.centerRight,
              4: pw.Alignment.centerRight,
            },
          ),
          pw.SizedBox(height: 18),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              '총 ${record.totalQuantity}대 · ${_money(record.totalPrice)}',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
          ),
          if (record.note.isNotEmpty) ...[
            pw.SizedBox(height: 24),
            pw.Text('메모', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 6),
            pw.Text(record.note, style: const pw.TextStyle(fontSize: 10)),
          ],
        ],
        footer: (context) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text(
            '${context.pageNumber} / ${context.pagesCount}',
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600),
          ),
        ),
      ),
    );
    return document.save();
  }

  Future<void> _print() async {
    if (_printing) return;
    setState(() {
      _printing = true;
      _error = null;
    });
    try {
      await Printing.layoutPdf(name: widget.record.title, onLayout: _buildPdf);
    } catch (_) {
      if (mounted) {
        setState(() => _error = '인쇄 파일을 준비하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.');
      }
    } finally {
      if (mounted) setState(() => _printing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final record = widget.record;
    return PopScope(
      canPop: !_printing,
      child: AlertDialog(
        title: const Text('견적서 미리보기'),
        content: SizedBox(
          width: 760,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  record.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  '${record.mode.label} 견적${record.customerName.isEmpty ? '' : ' · ${record.customerName}님'}',
                ),
                const SizedBox(height: 16),
                ...record.items.map(
                  (item) => Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: Theme.of(context).dividerColor,
                        ),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _rodLabel(item),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${item.length}칸 · ${item.quantity}대 · 단가 ${_money(item.finalUnitPrice)}',
                        ),
                        const SizedBox(height: 4),
                        Text('합계 ${_money(item.totalPrice)}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '총 ${record.totalQuantity}대 · ${_money(record.totalPrice)}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (record.note.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('메모: ${record.note}'),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: _printing ? null : () => Navigator.pop(context),
            child: const Text('닫기'),
          ),
          FilledButton.icon(
            onPressed: _printing ? null : _print,
            icon: _printing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.print_outlined),
            label: Text(_printing ? '준비 중...' : '인쇄'),
          ),
        ],
      ),
    );
  }
}
