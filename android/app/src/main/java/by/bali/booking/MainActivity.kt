package by.bali.booking
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity: Activity() {
  private lateinit var web: WebView
  private val base = "https://mvnxfouyoynqyjdpcblh.supabase.co/functions/v1/bali-booking-app?mode=admin"
  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(s: Bundle?) {
    super.onCreate(s); window.statusBarColor=Color.BLACK; window.navigationBarColor=Color.BLACK
    web=WebView(this); web.setBackgroundColor(Color.BLACK); setContentView(web)
    web.settings.javaScriptEnabled=true; web.settings.domStorageEnabled=true
    web.webViewClient=WebViewClient(); web.webChromeClient=WebChromeClient(); handle(intent)
  }
  override fun onNewIntent(i: Intent) { super.onNewIntent(i); setIntent(i); handle(i) }
  private fun handle(i: Intent) {
    val t=if(i.data?.scheme=="balibooking" && i.data?.host=="setup") i.data?.getQueryParameter("token") else null
    if(!t.isNullOrBlank()) getSharedPreferences("bali",MODE_PRIVATE).edit().putString("token",t).apply()
    val token=getSharedPreferences("bali",MODE_PRIVATE).getString("token","") ?: ""
    val url=if(token.isBlank()) base else "$base&setup="+java.net.URLEncoder.encode(token,"UTF-8")
    web.loadUrl(url)
  }
  @Deprecated("Deprecated in Java") override fun onBackPressed() { if(web.canGoBack()) web.goBack() else super.onBackPressed() }
}
