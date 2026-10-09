import WidgetKit
import SwiftUI

private let groupName = "group.vn.giadinhanam.family"
private struct FamilyEvent: Decodable, Identifiable { let id: String; let title: String; let dueAt: String }
private struct Snapshot: Decodable {
    let updatedAt: String
    let childName: String
    let birthday: String
    let weight: String
    let height: String
    let events: [FamilyEvent]
}
private func instant(_ value: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
}
private var familyCalendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    return calendar
}
private func stamp(_ date: Date, format: String) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "vi_VN")
    formatter.timeZone = familyCalendar.timeZone
    formatter.dateFormat = format
    return formatter.string(from: date)
}
private struct Entry: TimelineEntry { let date: Date; let snapshot: Snapshot? }
private struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: Date(), snapshot: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(read()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let entry = read()
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800))))
    }
    private func read() -> Entry {
        // No anonymous backend read and no embedded login/service-role credentials.
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupName) != nil,
              let raw = UserDefaults(suiteName: groupName)?.string(forKey: "anNamSnapshot"),
              let data = raw.data(using: .utf8),
              let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data) else {
            return Entry(date: Date(), snapshot: nil)
        }
        return Entry(date: Date(), snapshot: snapshot)
    }
}
private extension View {
    @ViewBuilder func anNamBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) { self.containerBackground(Color(red: 1, green: 0.97, blue: 0.94), for: .widget) }
        else { self.padding(12).background(Color(red: 1, green: 0.97, blue: 0.94)) }
    }
}
private struct WidgetContent: View {
    let entry: Entry
    let mode: String
    @Environment(\.widgetFamily) private var family
    private var destination: URL { URL(string: mode == "attention" ? "giadinhannam://family/attention" : mode == "calendar" ? "giadinhannam://gia-dinh" : "giadinhannam://em-be")! }
    private func age(_ birthday: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = familyCalendar.timeZone
        parser.dateFormat = "yyyy-MM-dd"
        guard let birth = parser.date(from: birthday), birth <= entry.date else { return "Chưa có ngày sinh" }
        let months = familyCalendar.dateComponents([.month], from: birth, to: entry.date).month ?? 0
        return "\(months) tháng tuổi"
    }
    private func visibleEvents(_ snapshot: Snapshot) -> [FamilyEvent] {
        snapshot.events.filter { event in
            guard let due = instant(event.dueAt) else { return false }
            return familyCalendar.isDate(due, equalTo: entry.date, toGranularity: .month)
        }.sorted { $0.dueAt < $1.dueAt }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Label("An Nam", systemImage: "house.fill").font(.caption).foregroundColor(.purple)
            if mode == "attention" {
                Image(systemName: "bell.badge.fill").font(.largeTitle).foregroundColor(.orange)
                Text("Cần bố/mẹ hỗ trợ").font(.headline)
                Text("Chạm → xác nhận gửi Telegram").font(.caption)
                Text("Không phải cuộc gọi cấp cứu").font(.caption2).foregroundColor(.secondary)
            } else if let snapshot = entry.snapshot {
                if mode == "baby" {
                    Text(snapshot.childName).font(.title3).bold().lineLimit(1).privacySensitive()
                    Text(age(snapshot.birthday)).font(.subheadline).privacySensitive()
                    Text("Cân nặng: \(snapshot.weight)").font(.caption).privacySensitive()
                    Text("Chiều cao: \(snapshot.height)").font(.caption).privacySensitive()
                } else {
                    let events = visibleEvents(snapshot)
                    Text("Tháng \(stamp(entry.date, format: "MM/yyyy")) · \(events.count) lịch").font(.headline)
                    if events.isEmpty { Text("Chưa có lịch trong dữ liệu đã tải").font(.caption) }
                    ForEach(Array(events.prefix(family == .systemLarge ? 8 : family == .systemSmall ? 2 : 4))) { event in
                        HStack(alignment: .top) {
                            if let due = instant(event.dueAt) { Text(stamp(due, format: "dd/MM HH:mm")).font(.caption2).foregroundColor(.purple) }
                            Text(event.title).font(.caption).lineLimit(1).privacySensitive()
                        }
                    }
                }
                Spacer(minLength: 0)
                if let updated = instant(snapshot.updatedAt) {
                    Text("Cập nhật \(stamp(updated, format: "dd/MM HH:mm"))").font(.system(size: 10)).foregroundColor(.secondary)
                    if entry.date.timeIntervalSince(updated) > 86400 { Text("Dữ liệu cũ · mở app để đồng bộ").font(.caption2).foregroundColor(.orange) }
                }
            } else {
                Text("Mở An Nam → Tiện ích").font(.headline)
                Text("Bật hiển thị dữ liệu. Bản ký cần giữ App Group cho cả app và widget.").font(.caption).foregroundColor(.secondary)
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .anNamBackground().widgetURL(destination)
    }
}
struct BabyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AnNamBaby", provider: Provider()) { WidgetContent(entry: $0, mode: "baby") }
            .configurationDisplayName("Bé yêu").description("Tên, tuổi và số đo mới nhất của bé đã chọn trong app.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
struct CalendarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AnNamCalendar", provider: Provider()) { WidgetContent(entry: $0, mode: "calendar") }
            .configurationDisplayName("Lịch tháng này").description("Lịch gia đình chưa hoàn thành, theo dữ liệu đã đồng bộ.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
struct AttentionWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AnNamAttention", provider: Provider()) { WidgetContent(entry: $0, mode: "attention") }
            .configurationDisplayName("Báo bố/mẹ cần hỗ trợ").description("Mở app để xác nhận gửi báo nhanh qua Telegram, không gọi điện.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
@main struct AnNamWidgets: WidgetBundle {
    var body: some Widget { BabyWidget(); CalendarWidget(); AttentionWidget() }
}
